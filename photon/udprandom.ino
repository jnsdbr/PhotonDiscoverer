#define SERVER_PORT 51013
#define BUFFER_SIZE 100
#define CLIENT_PORT 51014

// UDP
UDP udp;

// Multicast IP
IPAddress multicastIP(239, 13, 10, 13);

// UDP message buffer
char buffer[BUFFER_SIZE];

// Keyword
String keyword = "HELLOPHOTON";


// Var
int randomNumber1 = 0;

void setup()
{
    Serial.begin(9600);

    // Setup UDP Connection
    udp.begin(SERVER_PORT);
    udp.joinMulticast(multicastIP);

    // Publish var to cloud
    Particle.variable("number1", &randomNumber1, INT);
}

void loop()
{
    // Random nubmer
    randomNumber1 = random(2000);

    // Waiting for a Client
    waitingForApp();
}


void waitingForApp() {
    int packetSize = udp.parsePacket();

    // Check if data has been received
    if (packetSize > 0)
    {
        buffer[packetSize] = '\0'; // End string
        udp.read(buffer, BUFFER_SIZE);
        String input = buffer;

        udp.flush();

        // Simple auth
        if (keyword.equals(input.trim()))
        {
            // Store sender ip and port
            IPAddress ipAddress = udp.remoteIP();

            // Debugging
            Serial.print("[MSG]: ");
            Serial.print(System.deviceID());
            Serial.print("[TO]: ");
            Serial.print(ipAddress);
            Serial.print(":");
            Serial.println(CLIENT_PORT);

            // Echo back data to client
            udp.beginPacket(ipAddress, CLIENT_PORT);
            udp.write(System.deviceID());
            udp.endPacket();
        }
    }
}
