# ---------- Stage 1: build the jar with Maven ----------
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copy only the pom first so Docker can cache the dependency download layer
# separately from your source code (much faster rebuilds when you only
# change .java files).
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Now copy the actual source and build the jar (skip tests for faster/smaller CI builds;
# remove -DskipTests if you add real tests and want them run during the image build).
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---------- Stage 2: slim runtime image ----------
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Run as a non-root user
RUN groupadd -r spring && useradd -r -g spring spring
USER spring

COPY --from=build /app/target/booking-backend-1.0.0.jar app.jar

# Matches application.properties: server.port=${PORT:5000}
ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
