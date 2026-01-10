type AuthState = {
    session: Session | null
    user: User | null
    status: "loading" | "signed_in" | "signed_out"
  }