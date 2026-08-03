using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DailyWork.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkMetricTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkMetricDefinitions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkMetricDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WorkMetricEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WeekOf = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true),
                    DefinitionId = table.Column<int>(type: "integer", nullable: true),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkMetricEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkMetricEntries_WorkMetricDefinitions_DefinitionId",
                        column: x => x.DefinitionId,
                        principalTable: "WorkMetricDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WorkMetricDefinitions_IsActive",
                table: "WorkMetricDefinitions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_WorkMetricDefinitions_Title",
                table: "WorkMetricDefinitions",
                column: "Title",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkMetricEntries_DefinitionId",
                table: "WorkMetricEntries",
                column: "DefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkMetricEntries_WeekOf",
                table: "WorkMetricEntries",
                column: "WeekOf");

            migrationBuilder.CreateIndex(
                name: "IX_WorkMetricEntries_WeekOf_Title",
                table: "WorkMetricEntries",
                columns: new[] { "WeekOf", "Title" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkMetricEntries");

            migrationBuilder.DropTable(
                name: "WorkMetricDefinitions");
        }
    }
}
