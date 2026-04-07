using DailyWork.Api.Entities;
using DailyWork.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace DailyWork.Api.Data;

internal class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<ReadWatchItem> ReadWatchItems => Set<ReadWatchItem>();
    public DbSet<UpdateComm> UpdateComms => Set<UpdateComm>();
    public DbSet<ScratchPad> ScratchPads => Set<ScratchPad>();

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

        modelBuilder.Entity<UpdateComm>(e =>
        {
            e.ToTable("UpdateComms");
            e.HasDiscriminator(c => c.CommType)
             .HasValue<DailyStandupComm>(CommType.DailyStandup)
             .HasValue<WeeklyUpdateComm>(CommType.WeeklyUpdate);
            e.HasIndex(c => new { c.Date, c.CommType }).IsUnique();
        });

        modelBuilder.Entity<ScratchPad>(e =>
        {
            e.HasIndex(s => s.IsActive);
        });
    }
}
