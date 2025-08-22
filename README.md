Starting phase Flow

[User Signup/Login] 
    ↓
[Create Org + Workspace] 
    ↓
[Onboarding (5 steps)]
    ↓
[Onboarding Complete → Defaults Seeded]
    ↓
 ┌───────────────┬─────────────────────────┐
 │ Upload CSV/Doc │          Connect Tool  │
 │ (uploads)      │          (integrations)│
 └───────┬────────┴───────┬───────────────┘
         ↓                ↓
   [Parse Upload Job] [Integration Sync Job]
         ↓                ↓
         └────→ [Tickets (DB)] ←─────┘
                        ↓
                [Intent Analysis Job]
