const orderService = require('./order.service');

async function listOrders(req, res) {
  const orders = await orderService.listOrders(req.user.id);
  res.json({ data: orders });
}

async function getOrder(req, res) {
  const result = await orderService.getOrder(req.user.id, req.params.orderId);
  res.json(result);
}

async function confirmPayment(req, res) {
  const result = await orderService.confirmPayment(req.user.id, req.params.orderId);
  res.json({ success: true, ...result });
}

module.exports = {
  listOrders,
  getOrder,
  confirmPayment
};
