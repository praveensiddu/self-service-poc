import casbin
import os

MODEL_CONF = os.path.join(os.path.dirname(__file__), "casbin_model.conf")
POLICY_CSV = os.path.join(os.path.dirname(__file__), "casbin_policy.csv")

enforcer = casbin.Enforcer(MODEL_CONF, POLICY_CSV)