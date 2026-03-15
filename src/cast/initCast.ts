
export function initCast() {
  const w:any = window as any;

  if (!w.cast || !w.cast.framework) {
    console.log("Cast framework not ready yet");
    return;
  }

  const context = w.cast.framework.CastContext.getInstance();

  context.setOptions({
    receiverApplicationId: "CC1AD845",
    autoJoinPolicy: w.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED || "origin_scoped"
  });

  console.log("Cast initialized");
}
