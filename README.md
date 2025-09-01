## Starting Flow

```bash
[User Signup/Login] 
    ↓
[Onboarding (5 steps)]
    ↓
 ┌───────────────┬─────────────────────────┐
 │ Upload CSV/Doc │          Connect Tool  │
 │ (uploads)      │          (integrations)│
 └───────┬────────┴───────┬────────────────┴
         ↓                ↓
   [Parse Upload Job] [Integration Sync Job]
         ↓                ↓
         └────→ [Tickets (DB)] ←─────┘
                        ↓
                [Intent Analysis Job]
```

## Flow After Ticket Upload to intent agent

![link](https://github-production-user-asset-6210df.s3.amazonaws.com/160425975/484320451-8236826a-72fa-43ca-b788-71815611ca74.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=REMOVED%2F20250901%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250901T193819Z&X-Amz-Expires=300&X-Amz-Signature=1b781a35fdb25de263f215a939a04f6660fb55739114234b0b5c22ce23c603e4&X-Amz-SignedHeaders=host)