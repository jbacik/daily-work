const string dockerProject = "jb_daily-work";

var builder = DistributedApplication.CreateBuilder(args);

// Pin the image tag explicitly, and BEFORE WithDataVolume — the data directory layout is
// chosen from the configured tag at the time WithDataVolume runs. Aspire 13.4 moved the
// default from 17.6 to 18.3, and PG18 stores cluster files under a major-version
// subdirectory, so an unpinned tag silently breaks the volume on a future major bump.
var postgres = builder.AddPostgres("postgres")
	.WithImageTag("18.3")
	.WithDataVolume("dailywork-postgres-18-data")
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
