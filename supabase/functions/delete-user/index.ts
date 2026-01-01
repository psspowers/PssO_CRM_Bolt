import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DeleteUserRequest {
  user_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('[DELETE-USER] Starting user deletion request');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[DELETE-USER] Missing authorization header');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing authorization header'
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[DELETE-USER] Verifying requesting user token');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      console.error('[DELETE-USER] Auth error:', authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid or expired token'
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('[DELETE-USER] Requesting user ID:', requestingUser.id);
    console.log('[DELETE-USER] Checking if requesting user is admin');

    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from('crm_users')
      .select('role')
      .eq('id', requestingUser.id)
      .maybeSingle();

    if (profileError) {
      console.error('[DELETE-USER] Error fetching requesting user profile:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to verify admin status: ${profileError.message}`
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!requestingProfile || requestingProfile.role !== 'admin') {
      console.error('[DELETE-USER] User is not admin. Role:', requestingProfile?.role);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only admins can delete users'
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const body: DeleteUserRequest = await req.json();
    const { user_id } = body;

    console.log('[DELETE-USER] Deleting user:', user_id);

    if (!user_id) {
      console.error('[DELETE-USER] Missing user_id');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required field: user_id'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Prevent self-deletion
    if (user_id === requestingUser.id) {
      console.error('[DELETE-USER] User attempting to delete themselves');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You cannot delete your own account'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get user info before deletion for logging
    const { data: userData } = await supabaseAdmin
      .from('crm_users')
      .select('name, email')
      .eq('id', user_id)
      .maybeSingle();

    console.log('[DELETE-USER] Deleting from user_hierarchy');
    // Delete hierarchy records (both as manager and subordinate)
    await supabaseAdmin
      .from('user_hierarchy')
      .delete()
      .or(`manager_id.eq.${user_id},subordinate_id.eq.${user_id}`);

    console.log('[DELETE-USER] Deleting from crm_users');
    // Delete from CRM users
    const { error: crmDeleteError } = await supabaseAdmin
      .from('crm_users')
      .delete()
      .eq('id', user_id);

    if (crmDeleteError) {
      console.error('[DELETE-USER] Failed to delete CRM user:', crmDeleteError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to delete CRM user: ${crmDeleteError.message}`
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('[DELETE-USER] Deleting from auth.users');
    // Delete from Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error('[DELETE-USER] Failed to delete auth user:', authDeleteError);
      // CRM user is already deleted, so we log the error but still return success
      // This handles the case where auth user might already be deleted
      console.warn('[DELETE-USER] Auth user deletion failed, but CRM user was deleted');
    }

    console.log('[DELETE-USER] User deletion completed successfully');
    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${userData?.name || user_id} has been deleted`,
        deleted_user: userData
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200
      }
    );
  } catch (err: any) {
    console.error('[DELETE-USER] Unexpected error:', err);
    console.error('[DELETE-USER] Error stack:', err.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});