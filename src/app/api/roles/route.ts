import { NextResponse } from "next/server";

export async function GET() {
  const roles = [
    { name: "Frontend Developer" },
    { name: "Backend Developer" },
    { name: "Full Stack Developer" },
    { name: "Data Scientist" },
    { name: "Product Manager" },
    { name: "UI/UX Designer" },
    { name: "DevOps Engineer" },
    { name: "Blockchain Developer" }
  ];
  return NextResponse.json(roles);
}