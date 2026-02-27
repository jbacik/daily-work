using DailyWork.Api.Entities;
using DailyWork.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<ReadWatchItem> ReadWatchItems => Set<ReadWatchItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<WorkItem>(e =>
        {
            e.Property(w => w.Category)
                .HasConversion<string>();

            e.HasIndex(w => new { w.Date, w.Category });
        });

        modelBuilder.Entity<ReadWatchItem>(e =>
        {
            e.HasIndex(r => r.Date);
        });
    }
}
