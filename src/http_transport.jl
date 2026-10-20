const BODY_LIMIT = 16 * 1024
const RESPONSE_HEADERS = [
    "x-content-type-options" => "nosniff",
    "cache-control" => "no-store",
    "content-security-policy" => "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
]

function json_response(status, body; headers = Pair{String,String}[])
    HTTP.Response(status, vcat(RESPONSE_HEADERS, ["content-type" => "application/json; charset=utf-8"], headers), JSON.json(body))
end

error_response(status, message; headers = Pair{String,String}[]) =
    json_response(status, (error = (message = message,),); headers)

function start_server(handler; port = 3000)
    HTTP.serve!("127.0.0.1", port; stream = true, verbose = false, readtimeout = 10, listenany = iszero(port)) do stream
        request = stream.message
        payload = UInt8[]
        while !eof(stream) && length(payload) <= BODY_LIMIT
            append!(payload, read(stream, BODY_LIMIT + 1 - length(payload)))
        end
        request.body = payload
        response = if length(payload) > BODY_LIMIT
            error_response(413, "Request body is too large."; headers = ["connection" => "close"])
        else
            HTTP.closeread(stream)
            handler(request)
        end
        request.response = response
        response.request = request
        HTTP.startwrite(stream)
        write(stream, response.body)
        if length(payload) > BODY_LIMIT
            HTTP.closewrite(stream)
            close(stream)
        end
    end
end
