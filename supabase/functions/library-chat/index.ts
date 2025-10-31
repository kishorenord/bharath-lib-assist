import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_id } = await req.json();
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("No user found");
    }

    // Ensure we have a conversation_id
    let conversationId = conversation_id;
    if (!conversationId) {
      // Create a new conversation if not provided
      const { data: newConv, error: convError } = await supabaseClient
        .from("conversations")
        .insert({ user_id: user.id, title: "New Chat" })
        .select()
        .single();
      
      if (convError) throw convError;
      conversationId = newConv.id;
    }

    // Get conversation history (last 10 messages for context)
    const { data: history } = await supabaseClient
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const messages = [
      {
        role: "system",
        content: `You are a helpful Library Assistant for BHARATH UNIVERSITY. Your purpose is to:
- Help students find books by title, author, subject, or shelf location
- Provide physical locations using format: "Floor X, Section Y, Shelf Code Z"
- Check book availability and borrowing status
- Answer questions about library policies and borrowing rules
- Recommend books based on subjects or interests
- Be friendly, concise, and professional

When asked about book locations, always format responses clearly with floor, section, and shelf code.
Borrowing rules: 14-day loan period, max 5 books at a time, renewals allowed if no holds.`,
      },
      ...(history || []).reverse().map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI with message:", message);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact administration." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Save both user and assistant messages to history with conversation_id
    console.log("Saving messages with conversation_id:", conversationId);
    const { error: insertError } = await supabaseClient.from("chat_messages").insert([
      { user_id: user.id, conversation_id: conversationId, role: "user", content: message },
      { user_id: user.id, conversation_id: conversationId, role: "assistant", content: assistantMessage },
    ]);

    if (insertError) {
      console.error("Error inserting messages:", insertError);
      throw insertError;
    }

    console.log("Successfully processed and saved chat messages");

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in library-chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});