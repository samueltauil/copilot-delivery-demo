@testset "Request store" begin
    store = ResearchDesk.RequestStore()
    first = ResearchDesk.create_request!(store, Dict("requesterName" => "Demo Analyst"))
    second = ResearchDesk.create_request!(store, Dict("requesterName" => "Demo Developer", "description" => "Synthetic request"))
    @test first.id != second.id
    @test first.description == ""
    empty!(ResearchDesk.list_requests(store))
    @test length(ResearchDesk.list_requests(store)) == 2
    @test isempty(ResearchDesk.list_requests(ResearchDesk.RequestStore()))

    @testset "invalid objects and descriptions do not mutate" begin
        for input in (nothing, true, 7, "text", [])
            @test_throws ResearchDesk.InputError ResearchDesk.create_request!(store, input)
        end
        for description in (nothing, 0, false, [], Dict())
            @test_throws ResearchDesk.InputError ResearchDesk.create_request!(store, Dict("requesterName" => "Demo", "description" => description))
        end
        @test length(ResearchDesk.list_requests(store)) == 2
    end

    @testset "name rule" begin
        @test_throws ResearchDesk.InputError ResearchDesk.create_request!(store, Dict())
        for name in (nothing, 0, true, [], Dict(), "", " ", "\t\n", "\u00a0", "\ufeff")
            @test_throws ResearchDesk.InputError ResearchDesk.create_request!(store, Dict("requesterName" => name))
            @test length(ResearchDesk.list_requests(store)) == 2
        end
        @test ResearchDesk.create_request!(store, Dict("requesterName" => "  Jos\u00e9  ")).requesterName == "Jos\u00e9"
        @test ResearchDesk.create_request!(store, Dict("requesterName" => "\ufeffDemo\u00a0")).requesterName == "Demo"
        @test ResearchDesk.create_request!(store, Dict("requesterName" => "\u0085Demo\u0085")).requesterName == "\u0085Demo\u0085"
    end
end
