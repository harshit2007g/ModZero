# Demo Script — draft

Following spec §33. Fill in exact click-by-click steps once the flows work
end-to-end. Keep each scene under ~90 seconds on stage.

## Scene 1 — Alice publishes (root content)
- [ ] Connect wallet (alice.eth)
- [ ] Upload image
- [ ] Show fingerprint + watermark being generated (brief UI moment)
- [ ] Stake ETH, confirm tx
- [ ] Content appears in propagation graph as a single root node

## Scene 2 — Bob requests a legitimate license
- [ ] Bob opens Alice's content page
- [ ] Requests commercial license
- [ ] Alice's creator agent returns APPROVE + price (0.02 ETH)
- [ ] x402 payment flow completes
- [ ] License issued — graph updates: Alice —[LICENSED]→ Bob

## Scene 3 — Charlie copies without a license
- [ ] Charlie uploads the same/modified image
- [ ] Fingerprint + watermark match detected against Alice's root content
- [ ] No valid license found for Charlie
- [ ] Claim created automatically (or via a "flag" button for demo control)
- [ ] Claim resolves deterministically → economic consequence shown
- [ ] Graph shows: Alice → Bob [LICENSED], Alice → Charlie [UNAUTHORIZED]

## Closing line
> "No moderator was involved."

## Fallback / if something breaks live
- [ ] Have a pre-recorded backup clip of the full flow
- [ ] Know which step is most likely to fail (probably: watermark detection
      timing, or testnet tx confirmation latency) and have a talking point
      ready to bridge over it
