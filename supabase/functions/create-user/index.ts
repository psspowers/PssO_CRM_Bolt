import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  name: string;
  role: 'admin' | 'internal' | 'external';
  reports_to?: string | null;
  password?: string;
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

    console.log('[CREATE-USER] Starting user creation request');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-USER] Missing authorization header');
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
    console.log('[CREATE-USER] Extracting user from JWT (already verified by Supabase)');

    let requestingUserId: string;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      requestingUserId = payload.sub;
      console.log('[CREATE-USER] Requesting user ID from JWT:', requestingUserId);
    } catch (e) {
      console.error('[CREATE-USER] Failed to decode JWT:', e);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JWT token'
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
    console.log('[CREATE-USER] Checking if requesting user is admin');

    const { data: requestingProfile, error: profileError } = await supabaseAdmin
      .from('crm_users')
      .select('role')
      .eq('id', requestingUserId)
      .maybeSingle();

    if (profileError) {
      console.error('[CREATE-USER] Error fetching requesting user profile:', profileError);
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
      console.error('[CREATE-USER] User is not admin. Role:', requestingProfile?.role);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only admins can create users'
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

    const body: CreateUserRequest = await req.json();
    const { email, name, role, reports_to, password } = body;

    console.log('[CREATE-USER] Creating user:', { email, name, role, reports_to, hasPassword: !!password });

    if (!email || !name || !role) {
      console.error('[CREATE-USER] Missing required fields');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: email, name, role'
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

    console.log('[CREATE-USER] Creating auth user');
    const createUserPayload: any = {
      email,
      email_confirm: password ? true : false,
      user_metadata: { name }
    };
    
    if (password) {
      createUserPayload.password = password;
      console.log('[CREATE-USER] Setting user password (admin-assigned)');
    }
    
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser(createUserPayload);

    if (createError) {
      console.error('[CREATE-USER] Failed to create auth user:', createError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create auth user: ${createError.message}`
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

    if (!authData.user) {
      console.error('[CREATE-USER] No user returned from auth creation');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User creation failed - no user returned'
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

    console.log('[CREATE-USER] Auth user created:', authData.user.id);
    console.log('[CREATE-USER] Inserting CRM user record');

    const { error: insertError } = await supabaseAdmin
      .from('crm_users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        reports_to: reports_to || null,
        is_active: true,
        password_change_required: password ? true : false
      });

    if (insertError) {
      console.error('[CREATE-USER] Failed to insert CRM user:', insertError);
      console.log('[CREATE-USER] Cleaning up - deleting auth user');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create CRM user: ${insertError.message}`
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

    console.log('[CREATE-USER] CRM user inserted successfully');

    if (reports_to) {
      console.log('[CREATE-USER] Setting up hierarchy');
      const findAllManagers = async (userId: string): Promise<string[]> => {
        const managers: string[] = [];
        let currentUserId: string | null = userId;
        let depth = 1;

        while (currentUserId && depth <= 10) {
          const { data: user } = await supabaseAdmin
            .from('crm_users')
            .select('reports_to')
            .eq('id', currentUserId)
            .maybeSingle();

          if (!user?.reports_to) break;

          managers.push(user.reports_to);
          currentUserId = user.reports_to;
          depth++;
        }

        return managers;
      };

      const allManagers = await findAllManagers(authData.user.id);
      console.log('[CREATE-USER] Found managers:', allManagers);
      
      const hierarchyRecords = allManagers.map((managerId, index) => ({
        manager_id: managerId,
        subordinate_id: authData.user.id,
        depth: index + 1
      }));

      if (hierarchyRecords.length > 0) {
        const { error: hierarchyError } = await supabaseAdmin.from('user_hierarchy').insert(hierarchyRecords);
        if (hierarchyError) {
          console.error('[CREATE-USER] Failed to insert hierarchy:', hierarchyError);
        } else {
          console.log('[CREATE-USER] Hierarchy records inserted');
        }
      }
    }

    let inviteData = null;
    let inviteError = null;
    
    if (!password) {
      console.log('[CREATE-USER] Sending invitation email via inviteUserByEmail');
      console.log('[CREATE-USER] Target email:', email);
      console.log('[CREATE-USER] Auth user confirmed status:', authData.user.email_confirmed_at);

      const result = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      inviteData = result.data;
      inviteError = result.error;

      if (inviteError) {
        console.error('[CREATE-USER] ❌ FAILED to send invitation email');
        console.error('[CREATE-USER] Error details:', JSON.stringify(inviteError, null, 2));
        console.error('[CREATE-USER] Error message:', inviteError.message);
        console.error('[CREATE-USER] Error name:', inviteError.name);
        console.error('[CREATE-USER] Error status:', inviteError.status);
        console.error('[CREATE-USER] Full error object:', inviteError);

        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to send invitation email: ${inviteError.message}`,
            details: {
              error_code: inviteError.status || 'unknown',
              error_name: inviteError.name || 'unknown',
              supabase_error: inviteError
            }
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      } else {
        console.log('[CREATE-USER] ✅ Invitation email sent successfully');
        console.log('[CREATE-USER] Invite data:', inviteData);
      }
    } else {
      console.log('[CREATE-USER] Password provided - skipping invitation email');
    }

    console.log('[CREATE-USER] User creation completed');
    const response = {
      success: true,
      user: {
        id: authData.user.id,
        email,
        name,
        role
      },
      password_assigned: !!password,
      invitation_sent: !password && !inviteError,
      email_error: inviteError ? {
        message: inviteError.message,
        code: inviteError.code || 'unknown',
        details: inviteError
      } : null
    };

    console.log('[CREATE-USER] Final response:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200
      }
    );
  } catch (err: any) {
    console.error('[CREATE-USER] Unexpected error:', err);
    console.error('[CREATE-USER] Error stack:', err.stack);
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
