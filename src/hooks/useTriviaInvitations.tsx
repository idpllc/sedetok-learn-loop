import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useEffect } from "react";

export interface TriviaInvitation {
  id: string;
  sender_id: string;
  receiver_id: string;
  level: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  match_id: string | null;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  sender?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  receiver?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useTriviaInvitations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for invitations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('trivia-invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trivia_1v1_invitations',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trivia-invitations-received'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trivia_1v1_invitations',
          filter: `sender_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['trivia-invitations-sent'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Get received invitations
  const { data: receivedInvitations, isLoading: loadingReceived } = useQuery({
    queryKey: ['trivia-invitations-received', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: invitations, error } = await supabase
        .from('trivia_1v1_invitations')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!invitations || invitations.length === 0) return [];

      // Get sender profiles separately
      const senderIds = invitations.map(inv => inv.sender_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return invitations.map(inv => ({
        ...inv,
        sender: profileMap.get(inv.sender_id)
      })) as TriviaInvitation[];
    },
    enabled: !!user
  });

  // Get sent invitations
  const { data: sentInvitations, isLoading: loadingSent } = useQuery({
    queryKey: ['trivia-invitations-sent', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: invitations, error } = await supabase
        .from('trivia_1v1_invitations')
        .select('*')
        .eq('sender_id', user.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!invitations || invitations.length === 0) return [];

      // Get receiver profiles separately
      const receiverIds = invitations.map(inv => inv.receiver_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', receiverIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return invitations.map(inv => ({
        ...inv,
        receiver: profileMap.get(inv.receiver_id)
      })) as TriviaInvitation[];
    },
    enabled: !!user
  });

  // Send invitation
  const sendInvitation = useMutation({
    mutationFn: async ({ receiverId, level }: { receiverId: string; level: string }) => {
      if (!user) throw new Error("No autenticado");

      // Check if there's already a pending invitation
      const { data: existing } = await supabase
        .from('trivia_1v1_invitations')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', receiverId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existing) {
        throw new Error("Ya enviaste un reto pendiente a este usuario");
      }

      const { data, error } = await supabase
        .from('trivia_1v1_invitations')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          level,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification
      await supabase.from('notifications').insert({
        user_id: receiverId,
        type: 'trivia_invitation',
        title: '¡Te han retado!',
        message: `Tienes un nuevo reto de trivia`,
        related_id: data.id,
        related_type: 'trivia_invitation',
        read: false
      });

      // Send push notification
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: receiverId,
          title: '¡Te han retado!',
          message: 'Tienes un nuevo reto de trivia',
          url: '/trivia-game',
          notificationId: data.id,
          relatedId: data.id,
          relatedType: 'trivia_invitation'
        }
      });

      // Send email notification
      await supabase.functions.invoke('send-email-notification', {
        body: {
          userId: receiverId,
          notificationType: 'trivia_invitation',
          title: '¡Te han retado en SEDEFY Trivia!',
          message: 'Has recibido un nuevo reto de trivia. Ingresa a SEDEFY para aceptar el desafío y demostrar tus conocimientos.',
          relatedId: data.id,
          relatedType: 'trivia_invitation'
        }
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trivia-invitations-sent'] });
      toast({
        title: "✉️ Reto enviado",
        description: "Tu invitación ha sido enviada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Accept invitation
  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!user) throw new Error("No autenticado");

      // Get invitation details
      const { data: invitation, error: invError } = await supabase
        .from('trivia_1v1_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (invError) throw invError;

      // Create match
      const matchCode = generateMatchCode();
      const { data: match, error: matchError } = await supabase
        .from('trivia_1v1_matches')
        .insert({
          match_code: matchCode,
          level: invitation.level,
          status: 'active',
          started_at: new Date().toISOString(),
          current_player_id: invitation.sender_id // Sender starts
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Add both players
      await supabase.from('trivia_1v1_players').insert([
        {
          match_id: match.id,
          user_id: invitation.sender_id,
          player_number: 1
        },
        {
          match_id: match.id,
          user_id: invitation.receiver_id,
          player_number: 2
        }
      ]);

      // Update invitation
      const { error: updateError } = await supabase
        .from('trivia_1v1_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          match_id: match.id
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Notify sender
      await supabase.from('notifications').insert({
        user_id: invitation.sender_id,
        type: 'trivia_invitation_accepted',
        title: '¡Reto aceptado!',
        message: 'Tu reto ha sido aceptado',
        related_id: match.id,
        related_type: 'trivia_match',
        read: false
      });

      // Send push notification
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: invitation.sender_id,
          title: '¡Reto aceptado!',
          message: 'Tu reto ha sido aceptado. ¡La partida ha comenzado!',
          url: `/trivia-game?match=${match.id}`,
          notificationId: match.id,
          relatedId: match.id,
          relatedType: 'trivia_match'
        }
      });

      return match;
    },
    onSuccess: (match) => {
      queryClient.invalidateQueries({ queryKey: ['trivia-invitations-received'] });
      toast({
        title: "✅ Reto aceptado",
        description: "¡La partida ha comenzado!",
      });
      // Redirect to match
      window.location.href = `/trivia-game?match=${match.id}`;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Reject invitation
  const rejectInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('trivia_1v1_invitations')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trivia-invitations-received'] });
      toast({
        title: "❌ Reto rechazado",
        description: "Has rechazado la invitación",
      });
    }
  });

  // Cancel invitation
  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('trivia_1v1_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trivia-invitations-sent'] });
      toast({
        title: "Invitación cancelada",
        description: "Has cancelado la invitación",
      });
    }
  });

  return {
    receivedInvitations,
    sentInvitations,
    loadingReceived,
    loadingSent,
    sendInvitation,
    acceptInvitation,
    rejectInvitation,
    cancelInvitation
  };
};

function generateMatchCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
