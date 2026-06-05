using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyWork.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCarryoverMetadataToWorkItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSkipped",
                table: "WorkItems",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "OriginalDate",
                table: "WorkItems",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<int>(
                name: "TimesMoved",
                table: "WorkItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("UPDATE \"WorkItems\" SET \"OriginalDate\" = \"Date\"");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSkipped",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "OriginalDate",
                table: "WorkItems");

            migrationBuilder.DropColumn(
                name: "TimesMoved",
                table: "WorkItems");
        }
    }
}
