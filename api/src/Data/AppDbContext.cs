using DailyWork.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Data;

internal class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<ReadWatchItem> ReadWatchItems => Set<ReadWatchItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WorkItem>(e =>
        {
            e.HasIndex(w => new { w.Date, w.Category });
            e.HasIndex(w => w.WeekOf);
        });

        modelBuilder.Entity<ReadWatchItem>(e =>
        {
            e.HasIndex(r => r.Date);
        });
    }
}
