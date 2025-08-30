import amqp from "amqplib";
import dotenv from "dotenv";
dotenv.config();

import logger from "./logger.js";

let connection = null;
let channel = null;

const EXCHANGE_NAME = "posts_exchange";
async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: false });
    logger.info("Connected to RabbitMQ");
    return channel;
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ", error);
    throw error;
  }
}

// async function publishEvent(routingKey, message) {
//   if (!channel) {
//     await connectRabbitMQ();
//   }
//   await channel.publish(
//     EXCHANGE_NAME,
//     routingKey,
//     Buffer.from(JSON.stringify(message))
//   );
//   logger.info(
//     `Event published to ${EXCHANGE_NAME} with routing key ${routingKey}`
//   );
// }

async function consumeEvent(routingKey,callback) {
    if (!channel) {
        await connectRabbitMQ();
    }
    const q=await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(q.queue,EXCHANGE_NAME,routingKey);
    channel.consume(q.queue,(msg)=>{
        if(msg!==null){
            const content=JSON.parse(msg.content.toString());
            callback(content);
            channel.ack(msg)
        }
    })
    logger.info(`Subscribed to events with routing key ${routingKey}`);
}

export { connectRabbitMQ, consumeEvent };

