using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyWork.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLearningFieldsToReadWatchItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "ReadWatchItems",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "ReadWatchItems",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "ReadWatchItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "WeekConsumed",
                table: "ReadWatchItems",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WorthSharing",
                table: "ReadWatchItems",
                type: "boolean",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReadWatchItems_IsActive",
                table: "ReadWatchItems",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_ReadWatchItems_WeekConsumed",
                table: "ReadWatchItems",
                column: "WeekConsumed");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ReadWatchItems_IsActive",
                table: "ReadWatchItems");

            migrationBuilder.DropIndex(
                name: "IX_ReadWatchItems_WeekConsumed",
                table: "ReadWatchItems");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "ReadWatchItems");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "ReadWatchItems");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "ReadWatchItems");

            migrationBuilder.DropColumn(
                name: "WeekConsumed",
                table: "ReadWatchItems");

            migrationBuilder.DropColumn(
                name: "WorthSharing",
                table: "ReadWatchItems");
        }
    }
}
