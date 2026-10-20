struct InputError <: Exception
    message::String
    field::Union{String,Nothing}
end

InputError(message) = InputError(message, nothing)
Base.showerror(io::IO, error::InputError) = print(io, error.message)

struct RequestStore
    requests::Vector{NamedTuple}
    lock::ReentrantLock
end

RequestStore() = RequestStore(NamedTuple[], ReentrantLock())

# Match the browser's String.trim(), including BOM but excluding NEL.
trim_name(name::AbstractString) =
    String(strip(c -> (isspace(c) && c != '\u0085') || c == '\ufeff', name))

function list_requests(store::RequestStore)
    lock(store.lock) do
        copy(store.requests)
    end
end

function create_request!(store::RequestStore, input)
    input isa AbstractDict || throw(InputError("Request body must be a JSON object."))
    description = get(input, "description", "")
    description isa AbstractString || throw(InputError("Description must be text.", "description"))
    name = get(input, "requesterName", nothing)
    if !(name isa AbstractString) || isempty(trim_name(name))
        throw(InputError("Requester name is required.", "requesterName"))
    end
    request = (
        id = string(uuid4()),
        requesterName = trim_name(name),
        description = String(description),
    )
    lock(store.lock) do
        push!(store.requests, request)
    end
    return request
end
