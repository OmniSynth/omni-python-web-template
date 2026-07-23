import { Page, PageBody, PageHeader, PageMessage } from "@/components/layout/AppShell";
import { ProfileBasicSection, ProfileIdentitySection, ProfilePasswordSection } from "./components/profile-sections";
import { useProfilePage } from "./hooks/use-profile-page";

export function ProfilePage() {
  const page = useProfilePage();

  return (
    <Page>
      <PageHeader title="个人中心" subtitle="修改昵称、头像、密码与实名认证" />
      <PageBody>
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        <div className="mx-auto grid max-w-xl gap-8">
          <ProfileBasicSection page={page} />
          <ProfilePasswordSection page={page} />
          <ProfileIdentitySection page={page} />
        </div>
      </PageBody>
    </Page>
  );
}
