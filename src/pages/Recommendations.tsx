import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const Recommendations = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Recommendations</h1>
            <p className="text-muted-foreground">Personalized book recommendations based on your interests</p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Recommendations Coming Soon</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Our AI will analyze your borrowing history and preferences to suggest books you'll love
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Recommendations;