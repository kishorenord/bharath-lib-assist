import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, MapPin, BookOpen, Loader2, Heart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: string;
  title: string;
  author: string;
  subject: string;
  shelf_code: string;
  floor: string;
  section: string;
  available: boolean;
  description: string | null;
}

const Search = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    loadBooks();
    loadWishlist();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = books.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.subject.toLowerCase().includes(query) ||
          book.shelf_code.toLowerCase().includes(query)
      );
      setFilteredBooks(filtered);
    } else {
      setFilteredBooks(books);
    }
  }, [searchQuery, books]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("title", { ascending: true });

      if (error) throw error;
      setBooks(data || []);
      setFilteredBooks(data || []);
    } catch (error) {
      console.error("Error loading books:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("wishlist")
        .select("book_id")
        .eq("user_id", user.id);

      if (error) throw error;
      setWishlistIds(new Set(data?.map((item) => item.book_id) || []));
    } catch (error) {
      console.error("Error loading wishlist:", error);
    }
  };

  const addToWishlist = async (bookId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("wishlist")
        .insert({ user_id: user.id, book_id: bookId });

      if (error) throw error;

      setWishlistIds(new Set([...wishlistIds, bookId]));
      toast({
        title: "Added to wishlist",
        description: "Book has been added to your wishlist",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add to wishlist",
      });
    }
  };

  const removeFromWishlist = async (bookId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("book_id", bookId);

      if (error) throw error;

      const newWishlistIds = new Set(wishlistIds);
      newWishlistIds.delete(bookId);
      setWishlistIds(newWishlistIds);
      toast({
        title: "Removed from wishlist",
        description: "Book has been removed from your wishlist",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove from wishlist",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Search Books</h1>
            <p className="text-muted-foreground">Find books by title, author, subject, or shelf code</p>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredBooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No books found</h3>
                <p className="text-muted-foreground">Try adjusting your search query</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredBooks.map((book) => (
                <Card key={book.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{book.title}</CardTitle>
                      <Badge variant={book.available ? "default" : "secondary"}>
                        {book.available ? "Available" : "Borrowed"}
                      </Badge>
                    </div>
                    <CardDescription className="text-base">by {book.author}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
                      <span className="font-medium">
                        {book.floor}, {book.section}, {book.shelf_code}
                      </span>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {book.subject}
                      </Badge>
                    </div>
                    {book.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{book.description}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      {wishlistIds.has(book.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => removeFromWishlist(book.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => addToWishlist(book.id)}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Add to Wishlist
                        </Button>
                      )}
                    </div>
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

export default Search;