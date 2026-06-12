using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyWork.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReflectionsToWorkSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Reflections",
                table: "WorkSessions",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Reflections",
                table: "WorkSessions");
        }
    }
}
