import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Heart, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WishlistItem {
  id: string;
  book_id: string;
  books: {
    title: string;
    author: string;
    subject: string;
    shelf_code: string;
    floor: string;
    section: string;
    available: boolean;
    description: string | null;
  };
}

const Wishlist = () => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadWishlist();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          id,
          book_id,
          books (
            title,
            author,
            subject,
            shelf_code,
            floor,
            section,
            available,
            description
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error("Error loading wishlist:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load wishlist",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("id", wishlistId);

      if (error) throw error;

      setWishlist(wishlist.filter((item) => item.id !== wishlistId));
      toast({
        title: "Removed",
        description: "Book removed from wishlist",
      });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove book from wishlist",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Wishlist</h1>
              <p className="text-muted-foreground">Your saved books</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : wishlist.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Heart className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Your wishlist is empty</h3>
                <p className="text-muted-foreground mb-6">Start exploring!</p>
                <Button onClick={() => navigate("/search")}>Browse Books</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {wishlist.map((item) => (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{item.books.title}</CardTitle>
                      <Badge variant={item.books.available ? "default" : "secondary"}>
                        {item.books.available ? "Available" : "Borrowed"}
                      </Badge>
                    </div>
                    <CardDescription className="text-base">by {item.books.author}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
                      <span className="font-medium">
                        {item.books.floor}, {item.books.section}, {item.books.shelf_code}
                      </span>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {item.books.subject}
                      </Badge>
                    </div>
                    {item.books.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.books.description}</p>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => removeFromWishlist(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove from Wishlist
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Wishlist;
