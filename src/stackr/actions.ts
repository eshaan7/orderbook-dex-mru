import { ActionSchema, SolidityType } from "@stackr/sdk";

/**
 * CreateOrderSchema is an action schema for adding a new order.
 */
export const CreateOrderSchema = new ActionSchema("createOrder", {
  orderType: SolidityType.STRING,
  price: SolidityType.UINT,
  quantity: SolidityType.UINT,
  timestamp: SolidityType.UINT,
});

export const actionSchemas = {
  CreateOrderSchema,
};
