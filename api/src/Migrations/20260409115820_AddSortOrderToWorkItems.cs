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

            migrationBuilder.Sql(@"
                WITH ordered AS (
                    SELECT ""Id"", ""Category"",
                           ROW_NUMBER() OVER (
                               PARTITION BY ""Date"", ""Category""
                               ORDER BY ""Id""
                           ) AS rn
                    FROM ""WorkItems""
                )
                UPDATE ""WorkItems""
                SET ""SortOrder"" = CASE WHEN o.""Category"" = 1 THEN 0 ELSE o.rn END
                FROM ordered o
                WHERE ""WorkItems"".""Id"" = o.""Id"";
            ");

            migrationBuilder.CreateIndex(
                name: "IX_WorkItems_Date_Category_SortOrder",
                table: "WorkItems",
                columns: new[] { "Date", "Category", "SortOrder" });
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
