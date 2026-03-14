import { useState } from 'react'
import { ChevronDown, Copy, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const AWS_IAM_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KonformeReadOnlyScan",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVpcs",
        "ec2:DescribeFlowLogs",
        "ec2:DescribeNetworkAcls",
        "s3:ListAllMyBuckets",
        "s3:GetBucketEncryption",
        "s3:GetBucketPublicAccessBlock",
        "s3:GetBucketVersioning",
        "s3:GetBucketLogging",
        "iam:GetAccountPasswordPolicy",
        "iam:GetAccountSummary",
        "iam:ListUsers",
        "iam:ListAccessKeys",
        "iam:ListMFADevices",
        "cloudtrail:DescribeTrails",
        "cloudtrail:GetTrailStatus",
        "kms:ListKeys",
        "kms:DescribeKey",
        "rds:DescribeDBInstances",
        "guardduty:ListDetectors",
        "securityhub:DescribeHub",
        "acm:ListCertificates",
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeListeners",
        "wafv2:ListWebACLs",
        "sns:ListTopics",
        "cloudwatch:DescribeAlarms",
        "ecr:DescribeRepositories",
        "inspector2:ListFindings",
        "config:DescribeConfigurationRecorders",
        "config:DescribeConfigurationRecorderStatus",
        "backup:ListBackupPlans"
      ],
      "Resource": "*"
    }
  ]
}`

export default function AwsIamPolicy() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(AWS_IAM_POLICY)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <ChevronDown size={14} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        {t('getStarted.cloudIamPolicyTitle')}
      </button>
      {open && (
        <div className="mt-2 relative">
          <p className="text-[11px] text-navy-400 mb-2">{t('getStarted.cloudIamPolicyDesc')}</p>
          <div className="relative rounded-lg bg-navy-950 border border-navy-700 p-3 overflow-x-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded bg-navy-800 hover:bg-navy-700 text-navy-400 hover:text-white transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <pre className="text-[11px] text-navy-300 font-mono leading-relaxed whitespace-pre">{AWS_IAM_POLICY}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
