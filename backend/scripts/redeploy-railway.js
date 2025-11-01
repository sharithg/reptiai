const { GraphQLClient, gql } = require("graphql-request");
const { z } = require("zod");
const { parser } = require("zod-opts");

// Set up the environment variables schema
const envSchema = z.object({
  RAILWAY_API_TOKEN: z.string().uuid(),
});

// Parse the environment variables
const envResult = envSchema.safeParse(process.env);

// If the environment variables are not valid, exit with a friendly error
if (!envResult.success) {
  envResult.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    console.error(`${path}${issue.message}`);
  });
  process.exit(1);
}

const ENV_VARS = envResult.data;

// Parse the CLI arguments
// If the CLI arguments are not valid, zod-opts will print the help page
const CLI_ARGS = parser()
  .options({
    serviceId: {
      type: z.string().uuid(),
      alias: "s",
    },
    environmentId: {
      type: z.string().uuid(),
      alias: "e",
    },
    image: {
      type: z.string(),
      alias: "i",
    },
  })
  .parse(process.argv.slice(2));

// Set up the GraphQL client
const client = new GraphQLClient("https://backboard.railway.app/graphql/v2", {
  headers: {
    authorization: `Bearer ${ENV_VARS.RAILWAY_API_TOKEN}`,
  },
});

// Set up the GraphQL queries
const serviceInstanceUpdate = gql`
  mutation serviceInstanceUpdate($image: String!, $environmentId: String!, $serviceId: String!) {
    serviceInstanceUpdate(input: { source: { image: $image } }, serviceId: $serviceId, environmentId: $environmentId)
  }
`;

const serviceInstanceUpdateVariables = {
  image: CLI_ARGS.image,
  serviceId: CLI_ARGS.serviceId,
  environmentId: CLI_ARGS.environmentId,
};

const serviceInstanceRedeploy = gql`
  mutation serviceInstanceDeploy($serviceId: String!, $environmentId: String!, $latestCommit: Boolean) {
    serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId, latestCommit: $latestCommit)
  }
`;

const serviceInstanceRedeployVariables = {
  serviceId: CLI_ARGS.serviceId,
  environmentId: CLI_ARGS.environmentId,
  latestCommit: true,
};

// Main function
(async () => {
  try {
    // First: Update the service instance
    const updateResult = await client.request(serviceInstanceUpdate, serviceInstanceUpdateVariables);
    console.log("Service updated successfully:", updateResult);

    // Second: Redeploy the service (only after update completes)
    const redeployResult = await client.request(serviceInstanceRedeploy, serviceInstanceRedeployVariables);
    console.log("Service redeployed successfully:", redeployResult);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();