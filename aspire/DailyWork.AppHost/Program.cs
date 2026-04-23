const string dockerProject = "jb_daily-work";

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
	.WithDataVolume("dailywork-postgres-data")
	.WithLifetime(ContainerLifetime.Persistent)
	.WithContainerRuntimeArgs("--label", $"com.docker.compose.project={dockerProject}")
	.WithPgAdmin(pgAdmin => pgAdmin
		.WithContainerRuntimeArgs("--label", $"com.docker.compose.project={dockerProject}"));

var db = postgres.AddDatabase("dailywork");

var api = builder.AddProject<Projects.DailyWork_Api>("api")
	.WithReference(db)
	.WaitFor(db);

builder.AddViteApp("web", "../../web")
	.WithReference(api)
	.WaitFor(api)
	.WithEnvironment("VITE_API_URL", api.GetEndpoint("http"));

builder.Build().Run();
