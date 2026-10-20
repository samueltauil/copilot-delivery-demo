const TEST_STUDY = (
    dataset = "Eunomia", synthetic = true, conditionConceptId = 28060,
    condition = "Strep throat (tutorial cohort)", totalPeople = 3, cohortPeople = 2,
)
body(response) = JSON.parse(response.body)

function with_server(f; kwargs...)
    server = ResearchDesk.start_server(ResearchDesk.create_app(; study = TEST_STUDY, kwargs...); port = 0)
    try
        f("http://127.0.0.1:$(HTTP.port(server))")
    finally
        HTTP.forceclose(server)
    end
end

fetch_api(base, path = "/api/requests"; method = "GET", payload = "", headers = Pair{String,String}[]) =
    HTTP.request(method, base * path, headers, payload; status_exception = false, retry = false)
post(base, value) = fetch_api(base; method = "POST", payload = JSON.json(value), headers = ["content-type" => "application/json"])

struct BrokenStore end
ResearchDesk.list_requests(::BrokenStore) = error("private diagnostic")

@testset "HTTP API" begin
    @testset "startup warm-up never leaks its synthetic request" begin
        app = ResearchDesk.create_ready_app(; study = TEST_STUDY)
        @test body(app(HTTP.Request("GET", "/api/requests"))) == Dict("requests" => [])
        @test app(HTTP.Request("GET", "/api/study")).status == 200
    end

    with_server() do base
        response = post(base, Dict("requesterName" => "  Demo Analyst  "))
        @test response.status == 201
        request = body(response)["request"]
        @test Set(keys(request)) == Set(["id", "requesterName", "description"])
        @test request["requesterName"] == "Demo Analyst"
        @test request["description"] == ""
        @test body(fetch_api(base)) == Dict("requests" => [request])
    end

    @testset "exact name rejection and whitespace regression" begin
        with_server() do base
            inputs = [Dict(), [Dict("requesterName" => name) for name in (nothing, 3, false, [], Dict(), "", " \t\n ", "\ufeff", "\u00a0")]...]
            for input in inputs
                response = post(base, input)
                @test response.status == 400
                @test body(response) == Dict("error" => Dict("field" => "requesterName", "message" => "Requester name is required."))
                @test body(fetch_api(base)) == Dict("requests" => [])
            end
        end
    end

    @testset "transport errors do not mutate" begin
        with_server() do base
            cases = [
                ("{}", Pair{String,String}[], 415),
                ("{", ["content-type" => "application/json"], 400),
                ("", ["content-type" => "application/json"], 400),
                ("{\"requesterName\":\"Demo\"} trailing", ["content-type" => "application/json"], 400),
                ("{\"requesterName\":\"Demo\"}\n{}", ["content-type" => "application/json"], 400),
                ("{\"requesterName\":\"Demo\", \"extra\": NaN}", ["content-type" => "application/json"], 400),
                ("null", ["content-type" => "application/json"], 400),
                ("[]", ["content-type" => "application/json"], 400),
                (JSON.json(Dict("description" => "x"^17000)), ["content-type" => "application/json"], 413),
            ]
            for (payload, headers, status) in cases
                response = fetch_api(base; method = "POST", payload, headers)
                @test response.status == status
                @test body(response)["error"]["message"] isa String
            end
            @test fetch_api(base; method = "DELETE").status == 405
            @test body(fetch_api(base)) == Dict("requests" => [])
            @test post(base, Dict("requesterName" => "Demo", "description" => nothing)).status == 400
            response = fetch_api(base; method = "POST", payload = "{\"requesterName\":\"Demo\"}", headers = ["content-type" => "application/json; charset=utf-8"])
            @test response.status == 201
            response = fetch_api(base; method = "POST", payload = ["{\"requester", "Name\":\"Chunk Demo\"}"], headers = ["content-type" => "application/json"])
            @test response.status == 201
            response = fetch_api(base; method = "POST", payload = ["x"^8000, "x"^9000], headers = ["content-type" => "application/json"])
            @test response.status == 413
        end
    end

    @testset "fixed assets, headers and method boundaries" begin
        with_server() do base
            for path in ("/", "/app.js", "/styles.css")
                response = fetch_api(base, path)
                @test response.status == 200
                @test HTTP.header(response, "x-content-type-options") == "nosniff"
                @test HTTP.header(response, "cache-control") == "no-store"
                @test occursin("default-src 'self'", HTTP.header(response, "content-security-policy"))
            end
            for path in ("/package.json", "/src/server.jl", "/missing", "/%2e%2e/Project.toml")
                @test fetch_api(base, path).status == 404
            end
            response = fetch_api(base, "/"; method = "POST")
            @test response.status == 405
            @test HTTP.header(response, "allow") == "GET"
            @test fetch_api(base, "/api/study"; method = "POST").status == 405
            @test body(fetch_api(base, "/api/study")) == JSON.parse(JSON.json((study = TEST_STUDY,)))
        end
    end

    @testset "unexpected failures are logged, not success" begin
        errors = []
        with_server(; store = BrokenStore(), logger = (error, trace) -> push!(errors, error)) do base
            response = fetch_api(base)
            @test response.status == 500
            @test body(response) == Dict("error" => Dict("message" => "An unexpected server error occurred."))
            @test length(errors) == 1
        end
    end
end
