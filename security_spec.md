# Security Specification: ইমন স্টোর (Imon Store)

## Data Invariants
1. A store document must be owned by the authenticated user (`ownerId == request.auth.uid`).
2. Products, customers, transactions, stockMovements, and notes must belong to a valid store owned by the requesting user.
3. Customer PII and internal financial records cannot be accessed across shops.
4. Share tokens for customer view grant read-only access to that specific customer's transactions and balance, strictly excluding other customer files, private shop notes, or cost amounts.
5. In transactions and stock movements, `createdAt` and `idempotencyKey` cannot be mutated after creation.
6. Financial transaction amounts must be non-negative integers (in poisha or whole taka) with immutable transaction IDs.

## The Dirty Dozen Payloads (Penetration Test Vectors)
1. **Unauthenticated store creation:** Missing auth token.
2. **Identity Spoofing:** Writing `ownerId: "attacker_uid"` under a victim's store path.
3. **Shadow Field Injection:** Attempting to inject `isAdmin: true` into a store or user document.
4. **Denial of Wallet attack:** Injecting a 2MB string in `productName` or `transactionDescription`.
5. **PII Leakage:** Unauthenticated get request to `/stores/{storeId}/customers/{customerId}` without share token.
6. **Cross-Shop Leakage:** Reading store B's sales transactions while authenticated as store A's owner.
7. **Negative Amount Write:** Creating a cash sale transaction with `amount: -5000`.
8. **Direct Balance Tampering:** Setting customer balance arbitrarily without atomic transaction record.
9. **Timestamp Spoofing:** Supplying a backdated timestamp `createdAt: "1990-01-01"` instead of request time.
10. **Immutable Field Mutation:** Updating `createdAt` or `idempotencyKey` on an existing ledger record.
11. **Path Traversal / ID Poisoning:** Passing an ID containing illegal characters (e.g. `../../bad-id`).
12. **Blanket Query Scraping:** Running an unconstrained list query across all stores without specifying shop ownership.
