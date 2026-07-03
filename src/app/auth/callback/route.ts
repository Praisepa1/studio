import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);

    const code = searchParams.get("code");

    if (code) {
        const supabase = await createClient();

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        console.log("Exchange data:", data);
        console.error("Exchange error:", error);

        if (!error) {
            return NextResponse.redirect(`${origin}/dashboard`);
        }
    }

    return NextResponse.redirect(`${origin}/auth?error=oauth`);
}