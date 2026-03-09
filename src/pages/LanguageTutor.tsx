import { LanguageTutorChat } from "@/components/LanguageTutorChat";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const LanguageTutor = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <LanguageTutorChat />;
};

export default LanguageTutor;
