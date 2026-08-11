# Rice Stock Ledger

A small inventory tracker for a rice trading business, built with React + Vite.

## What it tracks

Two ways rice comes into stock, one way it goes out:

1. **Supplier purchases** — buying already-milled rice, in different types and
   grades, each at its own price from a supplier.
2. **Raw palay purchases + milling** — buying unmilled rice locally by weight
   (varies delivery to delivery), then recording a milling run that converts
   a given weight of raw palay into a quantity of finished rice.
3. **Stock-outs** — sales, damage, or adjustments that draw finished stock
   back down.

Both acquisition paths feed the same finished-stock pool per rice type, shown
on the Stock Room dashboard with a reorder-point gauge and status badge.

