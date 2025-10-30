import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface BorrowedBook {
  id: string;
  borrow_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  books: {
    title: string;
    author: string;
    shelf_code: string;
    floor: string;
    section: string;
  };
}

const MyBooks = () => {
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadBorrowedBooks();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadBorrowedBooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("borrowed_books")
        .select(`
          *,
          books (
            title,
            author,
            shelf_code,
            floor,
            section
          )
        `)
        .eq("user_id", user.id)
        .order("borrow_date", { ascending: false });

      if (error) throw error;
      setBorrowedBooks(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === "returned") {
      return <Badge variant="secondary">Returned</Badge>;
    }
    if (new Date(dueDate) < new Date() && status === "active") {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge className="bg-accent text-accent-foreground">Active</Badge>;
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Books</h1>
            <p className="text-muted-foreground">View and manage your borrowed books</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : borrowedBooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No borrowed books</h3>
                <p className="text-muted-foreground mb-4">You haven't borrowed any books yet</p>
                <Button onClick={() => navigate("/search")}>Browse Library</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {borrowedBooks.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl mb-1">{item.books.title}</CardTitle>
                        <CardDescription className="text-base">by {item.books.author}</CardDescription>
                      </div>
                      {getStatusBadge(item.status, item.due_date)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-accent" />
                        <span>
                          {item.books.floor}, {item.books.section}, {item.books.shelf_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>Borrowed: {formatDate(item.borrow_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-destructive" />
                        <span>Due: {formatDate(item.due_date)}</span>
                      </div>
                    </div>
                    {item.return_date && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        Returned on {formatDate(item.return_date)}
                      </div>
                    )}
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

export default MyBooks;