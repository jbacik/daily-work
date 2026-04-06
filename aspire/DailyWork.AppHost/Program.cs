var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithDataVolume("dailywork-postgres-data")
    .WithLifetime(ContainerLifetime.Persistent)
    .WithPgAdmin();

var db = postgres.AddDatabase("dailywork");

builder.AddProject<Projects.DailyWork_Api>("api")
    .WithReference(db)
    .WaitFor(db);

builder.Build().Run();
