import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, Hash, Heart, BookOpen, Calendar, Loader2 } from "lucide-react";

interface Profile {
  name: string;
  email: string;
  student_id: string | null;
}

interface BorrowedBook {
  id: string;
  due_date: string;
  status: string;
  books: {
    title: string;
    author: string;
  };
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadProfile();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name, email, student_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load borrowed books
      const { data: borrowedData, error: borrowedError } = await supabase
        .from("borrowed_books")
        .select(`
          id,
          due_date,
          status,
          books (
            title,
            author
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (borrowedError) throw borrowedError;
      setBorrowedBooks(borrowedData || []);

      // Load wishlist count
      const { count, error: wishlistError } = await supabase
        .from("wishlist")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (wishlistError) throw wishlistError;
      setWishlistCount(count || 0);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 md:ml-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
            <p className="text-muted-foreground">Your library account information</p>
          </div>

          {profile && (
            <>
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {getInitials(profile.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl">{profile.name}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Library Member
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                  {profile.student_id && (
                    <div className="flex items-center gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground" />
                      <span>Student ID: {profile.student_id}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Heart className="h-6 w-6 text-primary" />
                      <CardTitle>Wishlist</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{wishlistCount}</p>
                    <p className="text-sm text-muted-foreground mt-1">books saved</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-6 w-6 text-primary" />
                      <CardTitle>Currently Borrowed</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{borrowedBooks.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">books checked out</p>
                  </CardContent>
                </Card>
              </div>

              {/* Borrowed Books */}
              {borrowedBooks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Borrowings</CardTitle>
                    <CardDescription>Books you have checked out</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {borrowedBooks.map((borrowed) => (
                        <div
                          key={borrowed.id}
                          className="flex items-start justify-between p-4 border border-border rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold">{borrowed.books.title}</h4>
                            <p className="text-sm text-muted-foreground">by {borrowed.books.author}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4" />
                              <span>Due: {formatDate(borrowed.due_date)}</span>
                            </div>
                            <Badge variant="outline" className="mt-2">
                              {borrowed.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
