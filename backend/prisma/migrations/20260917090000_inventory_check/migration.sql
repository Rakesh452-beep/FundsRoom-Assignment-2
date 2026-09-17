-- AddCheckConstraint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_reserved_check" CHECK ("physicalQty" >= 0 AND "reservedQty" >= 0 AND "reservedQty" <= "physicalQty");