const { onCall, onRequest, HttpsError } =
  require("firebase-functions/v2/https");

const { defineSecret } =
  require("firebase-functions/params");

const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();

const db = admin.firestore();

const stripeSecretKey =
  defineSecret("STRIPE_SECRET_KEY");

const stripeWebhookSecret =
  defineSecret("STRIPE_WEBHOOK_SECRET");

function cleanText(value, fallback = "") {
  return String(value || fallback)
    .trim()
    .slice(0, 500);
}

function getNumericPrice(price) {
  const numericPrice = Number(
    String(price || "0").replace(/[^0-9.]/g, "")
  );

  if (
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This product has an invalid price."
    );
  }

  return numericPrice;
}

exports.createStripeCheckout = onCall(
  {
    secrets: [stripeSecretKey],
    cors: true
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in before paying."
      );
    }

    const {
      dropId,
      size,
      color,
      quantity,
      shipName,
      shipPhone,
      shipAddress,
      shipCity,
      shipState,
      shipZip
    } = request.data || {};

    const safeDropId = cleanText(dropId);
    const safeSize = cleanText(size);
    const safeColor = cleanText(
      color,
      "Default"
    );

    const safeQuantity = Math.max(
      1,
      Math.min(5, Number(quantity || 1))
    );

    if (!safeDropId || !safeSize) {
      throw new HttpsError(
        "invalid-argument",
        "Product and size are required."
      );
    }

    const shipping = {
      shipName: cleanText(shipName),
      shipPhone: cleanText(shipPhone),
      shipAddress: cleanText(shipAddress),
      shipCity: cleanText(shipCity),
      shipState: cleanText(shipState),
      shipZip: cleanText(shipZip)
    };

    if (
      !shipping.shipName ||
      !shipping.shipPhone ||
      !shipping.shipAddress ||
      !shipping.shipCity ||
      !shipping.shipState ||
      !shipping.shipZip
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Complete all shipping information."
      );
    }

    const dropRef =
      db.collection("drops").doc(safeDropId);

    const dropSnap = await dropRef.get();

    if (!dropSnap.exists) {
      throw new HttpsError(
        "not-found",
        "This product is no longer available."
      );
    }

    const product = dropSnap.data();

    if (product.active === false) {
      throw new HttpsError(
        "failed-precondition",
        "This product is unavailable."
      );
    }

    const availableStock = Number(
      product.sizes?.[safeSize] || 0
    );

    if (availableStock < safeQuantity) {
      throw new HttpsError(
        "failed-precondition",
        `Only ${availableStock} item(s) remain in size ${safeSize}.`
      );
    }

    const numericPrice =
      getNumericPrice(product.price);

    const unitAmount =
      Math.round(numericPrice * 100);

    const orderTotal =
      numericPrice * safeQuantity;

    const orderRef =
      db.collection("orders").doc();

    const orderNumber =
      `ICE-${orderRef.id
        .slice(0, 8)
        .toUpperCase()}`;

    await orderRef.set({
      orderId: orderRef.id,
      orderNumber,

      uid: request.auth.uid,
      email:
        request.auth.token.email || "",

      dropId: safeDropId,
      product: cleanText(
        product.title,
        "IcewearCraft Product"
      ),

      price: product.price,
      orderTotal,

      color: safeColor,
      size: safeSize,
      quantity: safeQuantity,

      imageUrl: cleanText(
        product.colors?.[safeColor] ||
        product.imageUrl ||
        ""
      ),

      ...shipping,

      status: "Awaiting Payment",
      paymentStatus: "Pending",
      eta: "4–5 Weeks",

      createdAt:
        admin.firestore.FieldValue
          .serverTimestamp()
    });

    const stripe =
      new Stripe(stripeSecretKey.value());

    try {
      const session =
        await stripe.checkout.sessions.create({
          mode: "payment",

          customer_email:
            request.auth.token.email ||
            undefined,

          client_reference_id:
            orderRef.id,

          success_url:
            "https://icewearcraft.com/?payment=success&session_id={CHECKOUT_SESSION_ID}",

          cancel_url:
            "https://icewearcraft.com/?payment=canceled",

          line_items: [
            {
              quantity: safeQuantity,

              price_data: {
                currency: "usd",
                unit_amount: unitAmount,

                product_data: {
                  name: cleanText(
                    product.title,
                    "IcewearCraft Product"
                  ),

                  description:
                    `${safeColor} / Size ${safeSize}`,

                  images:
                    product.imageUrl
                      ? [product.imageUrl]
                      : []
                }
              }
            }
          ],

          metadata: {
            orderId: orderRef.id,
            orderNumber,
            uid: request.auth.uid,
            dropId: safeDropId,
            size: safeSize,
            color: safeColor,
            quantity:
              String(safeQuantity)
          },

          payment_intent_data: {
            metadata: {
              orderId: orderRef.id,
              orderNumber
            }
          }
        });

      await orderRef.update({
        stripeCheckoutSessionId:
          session.id,

        checkoutUrl:
          session.url
      });

      return {
        url: session.url,
        orderId: orderRef.id,
        orderNumber
      };
    } catch (error) {
      console.error(
        "Stripe Checkout error:",
        error
      );

      await orderRef.update({
        status: "Payment Setup Failed",
        paymentStatus: "Checkout Error",
        paymentError:
          cleanText(error.message)
      });

      throw new HttpsError(
        "internal",
        "Unable to start secure checkout."
      );
    }
  }
);

exports.stripeWebhook = onRequest(
  {
    secrets: [
      stripeSecretKey,
      stripeWebhookSecret
    ]
  },
  async (request, response) => {
    const stripe =
      new Stripe(stripeSecretKey.value());

    const signature =
      request.headers["stripe-signature"];

    let event;

    try {
      event =
        stripe.webhooks.constructEvent(
          request.rawBody,
          signature,
          stripeWebhookSecret.value()
        );
    } catch (error) {
      console.error(
        "Webhook signature error:",
        error.message
      );

      response
        .status(400)
        .send(
          `Webhook Error: ${error.message}`
        );

      return;
    }

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session =
        event.data.object;

      const orderId =
        session.metadata?.orderId;

      if (!orderId) {
        response
          .status(400)
          .send("Missing order ID.");

        return;
      }

      const orderRef =
        db.collection("orders").doc(orderId);

      try {
        await db.runTransaction(
          async (transaction) => {
            const orderSnap =
              await transaction.get(orderRef);

            if (!orderSnap.exists) {
              throw new Error(
                "Order not found."
              );
            }

            const order =
              orderSnap.data();

            if (
              order.paymentStatus === "Paid"
            ) {
              return;
            }

            const dropRef =
              db
                .collection("drops")
                .doc(order.dropId);

            const dropSnap =
              await transaction.get(
                dropRef
              );

            if (!dropSnap.exists) {
              throw new Error(
                "Product not found."
              );
            }

            const product =
              dropSnap.data();

            const sizes = {
              ...(product.sizes || {})
            };

            const currentStock =
              Number(
                sizes[order.size] || 0
              );

            const purchasedQuantity =
              Number(
                order.quantity || 1
              );

            if (
              currentStock <
              purchasedQuantity
            ) {
              throw new Error(
                `Insufficient inventory for size ${order.size}.`
              );
            }

            sizes[order.size] =
              currentStock -
              purchasedQuantity;

            const totalInventory =
              Object.values(sizes).reduce(
                (total, stock) =>
                  total +
                  Number(stock || 0),
                0
              );

            transaction.update(
              dropRef,
              {
                sizes,
                inventory:
                  totalInventory,

                soldOut:
                  totalInventory === 0,

                active:
                  totalInventory > 0
              }
            );

            transaction.update(
              orderRef,
              {
                status: "Paid",
                paymentStatus: "Paid",

                stripePaymentStatus:
                  session.payment_status,

                stripePaymentIntentId:
                  session.payment_intent ||
                  "",

                amountPaid:
                  Number(
                    session.amount_total ||
                    0
                  ) / 100,

                paidAt:
                  admin.firestore
                    .FieldValue
                    .serverTimestamp()
              }
            );
          }
        );
      } catch (error) {
        console.error(
          "Paid order processing error:",
          error
        );

        response
          .status(500)
          .send(
            "Unable to process paid order."
          );

        return;
      }
    }

    if (
      event.type ===
      "checkout.session.expired"
    ) {
      const session =
        event.data.object;

      const orderId =
        session.metadata?.orderId;

      if (orderId) {
        await db
          .collection("orders")
          .doc(orderId)
          .set(
            {
              status:
                "Payment Expired",

              paymentStatus:
                "Expired",

              expiredAt:
                admin.firestore
                  .FieldValue
                  .serverTimestamp()
            },
            {
              merge: true
            }
          );
      }
    }

    response.status(200).json({
      received: true
    });
  }
);
