using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyWork.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWeekOfToWorkItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WeekOf",
                table: "WorkItems",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_WeekOf",
                table: "WorkItems",
                column: "WeekOf");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkItems_WeekOf",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "WeekOf",
                table: "WorkItems");
        }
    }
}
