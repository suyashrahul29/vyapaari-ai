import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}. Set it in .env.local`);
  return value;
}

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

async function main() {
  console.log("Fetching all users from Supabase Auth...");
  
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    throw authErr;
  }
  
  console.log(`Found ${users.length} auth user(s) in database.`);
  
  // Find the user with phone matching '9140923821'
  const targetUser = users.find(u => {
    if (!u.phone) return false;
    const cleanPhone = u.phone.replace(/[^\d]/g, "");
    return cleanPhone.includes("9140923821");
  });
  
  if (!targetUser) {
    console.log("No auth user found with phone number containing '9140923821'.");
    console.log("List of all auth users with phone numbers:");
    for (const u of users) {
      console.log(`- ID: ${u.id}, Phone: ${u.phone || "(no phone)"}, Email: ${u.email || "(no email)"}`);
    }
    return;
  }
  
  console.log(`Found matching Auth User:`);
  console.log(`- ID: ${targetUser.id}`);
  console.log(`- Phone: ${targetUser.phone}`);
  
  // Fetch their profile
  const { data: profile, error: profErr } = await supabase
    .from("business_profile")
    .select("*")
    .eq("user_id", targetUser.id)
    .maybeSingle();
    
  if (profErr) {
    throw profErr;
  }
  
  if (!profile) {
    console.log(`No business profile found for user ID ${targetUser.id}. Creating a new profile...`);
    const { error: insertErr } = await supabase
      .from("business_profile")
      .insert({
        user_id: targetUser.id,
        business_type: "Kirana Store",
        phone: targetUser.phone,
        onboarding_done: true
      });
      
    if (insertErr) {
      throw insertErr;
    }
    console.log("  ✓ Successfully created profile as 'Kirana Store'");
  } else {
    console.log(`Found business profile:`);
    console.log(`- Current Business: ${profile.business_type}`);
    console.log(`- Current Name: ${profile.owner_name}`);
    
    // Update the business type to Kirana Store
    const { error: updateErr } = await supabase
      .from("business_profile")
      .update({
        business_type: "Kirana Store",
        phone: targetUser.phone, // also backfill the phone column
        onboarding_done: true
      })
      .eq("user_id", targetUser.id);
      
    if (updateErr) {
      throw updateErr;
    }
    console.log("  ✓ Successfully updated profile to 'Kirana Store' and populated phone column");
  }
}

main().catch(console.error);
