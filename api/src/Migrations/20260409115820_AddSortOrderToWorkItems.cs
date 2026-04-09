using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyWork.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSortOrderToWorkItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "WorkItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_Date_Category_SortOrder",
                table: "WorkItems",
                columns: new[] { "Date", "Category", "SortOrder" });

            migrationBuilder.Sql(@"
                UPDATE ""WorkItems"" SET ""SortOrder"" = (
                    SELECT COUNT(*) FROM ""WorkItems"" w2
                    WHERE w2.""Date"" = ""WorkItems"".""Date""
                      AND w2.""Category"" = ""WorkItems"".""Category""
                      AND w2.""Id"" < ""WorkItems"".""Id""
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkItems_Date_Category_SortOrder",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "WorkItems");
        }
    }
}
