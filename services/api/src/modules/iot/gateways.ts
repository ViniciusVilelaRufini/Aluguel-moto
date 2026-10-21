import { BaseIotGateway } from './base-iot-gateway';

/** IOT_MODE=local: Mosquitto do docker-compose, com o servidor emulando o serviço de shadow do IoT Core (`LocalMqttTransport`). */
export class LocalMqttIotGateway extends BaseIotGateway {}

/** IOT_MODE=aws: AWS IoT Core via IoT Data Plane (`AwsIotTransport`). */
export class AwsIotGateway extends BaseIotGateway {}
