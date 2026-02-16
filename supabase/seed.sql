-- NANTO ERP - Seed Data
-- Run AFTER migration and AFTER creating auth users in Supabase Dashboard

-- Sample products (from typical Raynet data)
INSERT INTO products (raynet_id, sku, name, category, product_line, unit, sell_price) VALUES
  (29, 'AR 12 CO - FJM', 'Samsung Comfort WindFree AR 12 CO', 'MULTISPLIT klimatizace', 'COMFORT', 'ks', 14575),
  (24, 'AR 09 CO - FJM', 'Samsung Comfort WindFree AR 09 CO', 'MULTISPLIT klimatizace', 'COMFORT', 'ks', 13118),
  (113, 'AJ 100 TXJ 5', 'Venkovní jednotka FJM Multisplit 1-5', 'MULTISPLIT klimatizace', 'Venkovní jednotka', 'ks', 95369),
  (357, 'MontVnitrni', 'Montáž vnitřní jednotky', 'Montáž klimatizace', NULL, 'ks', 2200),
  (356, 'MontVenkovni', 'Montáž venkovní jednotky', 'Montáž klimatizace', NULL, 'ks', 6500),
  (355, 'DoprAC', 'Doprava', 'Montáž klimatizace', NULL, 'ks', 1800)
ON CONFLICT (sku) DO NOTHING;

-- Update stock with sample purchase prices
UPDATE stock SET
  last_purchase_price = 6996,
  avg_purchase_price = 6996,
  on_hand = 3,
  min_quantity = 2
WHERE product_id = (SELECT id FROM products WHERE sku = 'AR 12 CO - FJM');

UPDATE stock SET
  last_purchase_price = 6297,
  avg_purchase_price = 6297,
  on_hand = 5,
  min_quantity = 3
WHERE product_id = (SELECT id FROM products WHERE sku = 'AR 09 CO - FJM');

UPDATE stock SET
  last_purchase_price = 45777,
  avg_purchase_price = 45777,
  on_hand = 1,
  min_quantity = 1
WHERE product_id = (SELECT id FROM products WHERE sku = 'AJ 100 TXJ 5');
