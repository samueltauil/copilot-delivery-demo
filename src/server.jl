const ASSETS = Dict(
    "/" => ("index.html", "text/html; charset=utf-8"),
    "/app.js" => ("app.js", "text/javascript; charset=utf-8"),
    "/styles.css" => ("styles.css", "text/css; charset=utf-8"),
)
function create_app(; store = RequestStore(), study = load_study(),
                    logger = (error, trace) -> @error("Request failed", exception = (error, trace)))
    return function(request::HTTP.Request)
        try
            path = HTTP.URI(request.target).path
            if path == "/api/requests"
                if request.method == "GET"
                    return json_response(200, (requests = list_requests(store),))
                elseif request.method == "POST"
                    media_type = lowercase(strip(first(split(HTTP.header(request, "Content-Type"), ';'))))
                    media_type == "application/json" || return error_response(415, "Content-Type must be application/json.")
                    length(request.body) <= BODY_LIMIT || return error_response(413, "Request body is too large.")
                    input = try
                        JSON.parse(request.body; dicttype = Dict{String,Any}, allownan = false)
                    catch error
                        error isa ArgumentError || rethrow()
                        return error_response(400, "Request body must be valid JSON.")
                    end
                    return json_response(201, (request = create_request!(store, input),))
                end
                return error_response(405, "Method not allowed."; headers = ["allow" => "GET, POST"])
            elseif path == "/api/study"
                request.method == "GET" || return error_response(405, "Method not allowed."; headers = ["allow" => "GET"])
                return json_response(200, (study = study,))
            elseif haskey(ASSETS, path)
                request.method == "GET" || return error_response(405, "Method not allowed."; headers = ["allow" => "GET"])
                filename, content_type = ASSETS[path]
                return HTTP.Response(200, vcat(RESPONSE_HEADERS, ["content-type" => content_type]),
                    read(joinpath(@__DIR__, "..", "public", filename)))
            end
            return error_response(404, "Not found.")
        catch error
            if error isa InputError
                detail = isnothing(error.field) ? (message = error.message,) : (field = error.field, message = error.message)
                return json_response(400, (error = detail,))
            end
            logger(error, catch_backtrace())
            return error_response(500, "An unexpected server error occurred.")
        end
    end
end

function create_ready_app(; study = load_study())
    # Compile request paths against a disposable store before opening the listener.
    warmup = create_app(; study)
    request = HTTP.Request("POST", "/api/requests", ["content-type" => "application/json"],
        collect(codeunits(JSON.json((requesterName = "Warm-up Demo", description = "Synthetic startup check")))))
    warmup(request).status == 201 || error("Request-path warm-up failed.")
    warmup(HTTP.Request("GET", "/api/requests")).status == 200 || error("List-path warm-up failed.")
    warmup(HTTP.Request("GET", "/api/study")).status == 200 || error("Study-path warm-up failed.")
    return create_app(; study)
end
