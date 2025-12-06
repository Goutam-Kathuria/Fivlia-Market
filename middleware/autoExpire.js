productSchema.post(["find", "findOne"], function (docs) {
  const now = new Date();

  const markExpired = (doc) => {
    if (
      doc &&
      doc.expiresAt &&
      doc.expiresAt < now &&
      doc.productStatus === "active"
    ) {
      doc.productStatus = "expired";
    }
  };

  if (Array.isArray(docs)) docs.forEach(markExpired);
  else markExpired(docs);
});
