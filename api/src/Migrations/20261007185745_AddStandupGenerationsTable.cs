using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DailyWork.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStandupGenerationsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GenerationId",
                table: "UpdateComms",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StandupGenerations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    CommType = table.Column<int>(type: "integer", nullable: false),
                    PromptVariant = table.Column<string>(type: "text", nullable: false),
                    SystemPrompt = table.Column<string>(type: "text", nullable: false),
                    UserMessage = table.Column<string>(type: "text", nullable: false),
                    GeneratedMarkdown = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StandupGenerations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UpdateComms_GenerationId",
                table: "UpdateComms",
                column: "GenerationId");

            migrationBuilder.CreateIndex(
                name: "IX_StandupGenerations_Date",
                table: "StandupGenerations",
                column: "Date");

            migrationBuilder.AddForeignKey(
                name: "FK_UpdateComms_StandupGenerations_GenerationId",
                table: "UpdateComms",
                column: "GenerationId",
                principalTable: "StandupGenerations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UpdateComms_StandupGenerations_GenerationId",
                table: "UpdateComms");

            migrationBuilder.DropTable(
                name: "StandupGenerations");

            migrationBuilder.DropIndex(
                name: "IX_UpdateComms_GenerationId",
                table: "UpdateComms");

            migrationBuilder.DropColumn(
                name: "GenerationId",
                table: "UpdateComms");
        }
    }
}
