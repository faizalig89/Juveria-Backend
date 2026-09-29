import fs from "fs";

const path = "./src/asp/asp.service.ts";
let source = fs.readFileSync(path, "utf8");

fs.copyFileSync(
  path,
  `${path}.stage15-4-before-pending-fix`,
);

const oldAttempt = `          completedAt,
        },
      });

      const persistedResult =`;

const newAttempt = `          completedAt:
            result.status === 'PENDING'
              ? null
              : completedAt,
        },
      });

      const persistedResult =`;

if (!source.includes(oldAttempt)) {
  throw new Error(
    "Expected attempt completedAt block not found. STOP."
  );
}

source = source.replace(
  oldAttempt,
  newAttempt,
);

const oldSubmission = `            completedAt,
            acceptedAt:
              result.status === 'ACCEPTED'`;

const newSubmission = `            completedAt:
              result.status === 'PENDING'
                ? null
                : completedAt,
            acceptedAt:
              result.status === 'ACCEPTED'`;

if (!source.includes(oldSubmission)) {
  throw new Error(
    "Expected submission completedAt block not found. STOP."
  );
}

source = source.replace(
  oldSubmission,
  newSubmission,
);

fs.writeFileSync(path, source, "utf8");

const verify = fs.readFileSync(path, "utf8");

const pendingGuards =
  verify.match(
    /result\.status === 'PENDING'/g
  ) ?? [];

const checks = {
  twoPendingCompletionGuards:
    pendingGuards.length >= 2,

  pendingCanRemainIncomplete:
    verify.includes(
      "result.status === 'PENDING'\n              ? null"
    ),

  acceptedTimestampPreserved:
    verify.includes(
      "result.status === 'ACCEPTED'"
    ),

  rejectedTimestampPreserved:
    verify.includes(
      "result.status === 'REJECTED'"
    ),

  unknownHandlingPreserved:
    verify.includes(
      "ASP_RESPONSE_UNKNOWN"
    ),
};

console.log(
  "\n===== PENDING STATE FIX ASSERTIONS ====="
);
console.log(checks);

if (
  Object.values(checks).some(
    value => value !== true
  )
) {
  throw new Error(
    "Pending-state source verification failed. STOP."
  );
}

console.log(
  "\nSTAGE_15_4_PENDING_STATE_PATCHED"
);
