import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  const serialized = serialize("skillviva_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: -1, // expire immediately
    path: "/",
  });

  const response = NextResponse.json({ message: "Logged out successfully" });
  response.headers.set("Set-Cookie", serialized);
  return response;
}